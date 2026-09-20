import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { useDropzone, type FileError, type FileRejection } from 'react-dropzone'

interface FileWithPreview extends File {
  preview?: string
  errors: readonly FileError[]
}

type UseR2UploadOptions = {
  /**
   * R2 "bucket" — really just a key prefix, since it's one physical bucket behind the worker
   */
  bucketName: string
  /**
   * Folder/path to upload files to within the prefix.
   *
   * Defaults to uploading files to the root of the bucket
   *
   * e.g If specified path is `test`, your file will be uploaded as `test/file_name`
   */
  path?: string
  /**
   * Allowed MIME types for each file upload (e.g `image/png`, `text/html`, etc). Wildcards are also supported (e.g `image/*`).
   *
   * Defaults to allowing uploading of all MIME types.
   */
  allowedMimeTypes?: string[]
  /**
   * Maximum upload size of each file allowed in bytes. (e.g 1000 bytes = 1 KB)
   */
  maxFileSize?: number
  /**
   * Maximum number of files allowed per upload.
   */
  maxFiles?: number
  /**
   * When set to true, the file is overwritten if it exists (R2 .put() overwrites by default,
   * so this is mostly kept for interface parity — set to false to error on collision instead).
   */
  upsert?: boolean
}

type UseR2UploadReturn = ReturnType<typeof useR2Upload>

type UploadResponse = {
  name: string
  message?: string
  url?: string
}

/**
 * Everything that changes together on an upload is now ONE piece of state,
 * updated by ONE reducer action. Previously `successes` and `uploadedUrls`
 * were separate useState calls set back-to-back in the same async callback —
 * that's two renders' worth of state that a consumer's effect can observe out
 * of sync with each other (isSuccess flips true from `successes` while
 * `uploadedUrls` for that same file is still the value from BEFORE this
 * upload). A single state object, updated by one dispatch, makes that
 * ordering bug structurally impossible: there is no render where `successes`
 * reflects this upload but `uploadedUrls` doesn't.
 */
type State = {
  files: FileWithPreview[]
  loading: boolean
  errors: { name: string; message: string }[]
  successes: string[]
  uploadedUrls: Record<string, string>
}

const initialState: State = {
  files: [],
  loading: false,
  errors: [],
  successes: [],
  uploadedUrls: {},
}

type Action =
  | { type: 'FILES_ADDED'; files: FileWithPreview[] }
  | { type: 'FILES_SET'; files: FileWithPreview[] } // for the "clear too-many-files error" pass
  | { type: 'UPLOAD_STARTED' }
  | { type: 'UPLOAD_FINISHED'; responses: UploadResponse[] }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FILES_ADDED': {
      return { ...state, files: action.files }
    }
    case 'FILES_SET': {
      return { ...state, files: action.files }
    }
    case 'UPLOAD_STARTED': {
      return { ...state, loading: true }
    }
    case 'UPLOAD_FINISHED': {
      const errors = action.responses
        .filter((r) => r.message !== undefined)
        .map((r) => ({ name: r.name, message: r.message! }))

      const succeeded = action.responses.filter((r) => r.message === undefined)

      const successes = Array.from(
        new Set([...state.successes, ...succeeded.map((r) => r.name)])
      )

      const uploadedUrls = { ...state.uploadedUrls }
      for (const r of succeeded) {
        if (r.url) uploadedUrls[r.name] = r.url
      }

      return { ...state, loading: false, errors, successes, uploadedUrls }
    }
    default:
      return state
  }
}

const useR2Upload = (options: UseR2UploadOptions) => {
  const {
    bucketName,
    path,
    allowedMimeTypes = [],
    maxFileSize = Number.POSITIVE_INFINITY,
    maxFiles = 1,
    upsert = true,
  } = options

  const [state, dispatch] = useReducer(reducer, initialState)
  const { files, loading, errors, successes, uploadedUrls } = state

  // isSuccess and uploadedUrls now always come from the SAME state snapshot,
  // so a consumer reading both in one effect can never see one updated
  // without the other.
  const isSuccess = useMemo(() => {
    if (errors.length === 0 && successes.length === 0) {
      return false
    }
    if (errors.length === 0 && successes.length === files.length) {
      return true
    }
    return false
  }, [errors.length, successes.length, files.length])

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const validFiles = acceptedFiles
        .filter((file) => !files.find((x) => x.name === file.name))
        .map((file) => {
          ;(file as FileWithPreview).preview = URL.createObjectURL(file)
          ;(file as FileWithPreview).errors = []
          return file as FileWithPreview
        })

      const invalidFiles = fileRejections.map(({ file, errors }) => {
        ;(file as FileWithPreview).preview = URL.createObjectURL(file)
        ;(file as FileWithPreview).errors = errors
        return file as FileWithPreview
      })

      const newFiles = [...files, ...validFiles, ...invalidFiles]

      dispatch({ type: 'FILES_ADDED', files: newFiles })
    },
    [files]
  )

  const dropzoneProps = useDropzone({
    onDrop,
    noClick: true,
    accept: allowedMimeTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxFileSize,
    maxFiles: maxFiles,
    multiple: maxFiles !== 1,
  })

  const onUpload = useCallback(async () => {
    dispatch({ type: 'UPLOAD_STARTED' })

    // Same partial-retry behavior as before: if any files errored, retrying
    // only re-attempts those + not-yet-successful ones.
    const filesWithErrors = errors.map((x) => x.name)
    const filesToUpload =
      filesWithErrors.length > 0
        ? [
            ...files.filter((f) => filesWithErrors.includes(f.name)),
            ...files.filter((f) => !successes.includes(f.name)),
          ]
        : files

    const responses: UploadResponse[] = await Promise.all(
      filesToUpload.map(async (file) => {
        const key = path ? `${bucketName}/${path}/${file.name}` : `${bucketName}/${file.name}`

        try {
          const res = await fetch(`/api/upload?key=${encodeURIComponent(key)}${upsert ? '' : '&upsert=false'}`, {
            method: 'PUT',
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
            body: file,
          })

          if (!res.ok) {
            const message = await res.text()
            return { name: file.name, message: message || `Upload failed (${res.status})` }
          }

          // The worker responds with { success, key, url } — url is the real,
          // publicly-servable R2 URL. Capture it so callers don't have to
          // reconstruct (and potentially get wrong) the public URL themselves.
          let url: string | undefined
          try {
            const body = await res.json()
            url = body?.url
          } catch {
            // Worker didn't return JSON for some reason — fall back to
            // undefined; caller treats this as "upload succeeded, URL
            // unknown" (surfaced via a console.error in ImageUpload).
          }

          return { name: file.name, message: undefined, url }
        } catch (err) {
          return { name: file.name, message: err instanceof Error ? err.message : 'Upload failed' }
        }
      })
    )

    dispatch({ type: 'UPLOAD_FINISHED', responses })
  }, [files, path, bucketName, errors, successes, upsert])

  useEffect(() => {
    if (files.length === 0) {
      if (errors.length > 0) dispatch({ type: 'UPLOAD_FINISHED', responses: [] })
      return
    }

    // If the number of files doesn't exceed maxFiles, drop the "too many
    // files" error from each file.
    if (files.length <= maxFiles) {
      let changed = false
      const newFiles = files.map((file) => {
        if (file.errors.some((e) => e.code === 'too-many-files')) {
          file.errors = file.errors.filter((e) => e.code !== 'too-many-files')
          changed = true
        }
        return file
      })
      if (changed) {
        dispatch({ type: 'FILES_SET', files: newFiles })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length, maxFiles])

  return {
    files,
    setFiles: (f: FileWithPreview[]) => dispatch({ type: 'FILES_SET', files: f }),
    successes,
    uploadedUrls,
    isSuccess,
    loading,
    errors,
    setErrors: (e: { name: string; message: string }[]) =>
      dispatch({ type: 'UPLOAD_FINISHED', responses: e.map((x) => ({ name: x.name, message: x.message })) }),
    onUpload,
    maxFileSize: maxFileSize,
    maxFiles: maxFiles,
    allowedMimeTypes,
    ...dropzoneProps,
  }
}

export { useR2Upload, type UseR2UploadOptions, type UseR2UploadReturn }