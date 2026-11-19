import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { useDropzone, type FileError, type FileRejection } from 'react-dropzone'

interface FileWithPreview extends File {
  preview?: string
  errors: readonly FileError[]
}

type UseUploadOptions = {
  /**
   * Top-level key prefix (`store-assets` or `product-images`); it is one physical B2 bucket.
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
   * Kept for interface parity: /api/upload always overwrites an existing key.
   */
  upsert?: boolean
}

type UseUploadReturn = ReturnType<typeof useUpload>

type UploadResponse = {
  name: string
  message?: string
  url?: string
  /** The key the server stored it under (unique per upload, so not the file name). */
  key?: string
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
  uploadedKeys: Record<string, string>
}

const initialState: State = {
  files: [],
  loading: false,
  errors: [],
  successes: [],
  uploadedUrls: {},
  uploadedKeys: {},
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
      const uploadedKeys = { ...state.uploadedKeys }
      for (const r of succeeded) {
        if (r.url) uploadedUrls[r.name] = r.url
        if (r.key) uploadedKeys[r.name] = r.key
      }

      return { ...state, loading: false, errors, successes, uploadedUrls, uploadedKeys }
    }
    default:
      return state
  }
}

const useUpload = (options: UseUploadOptions) => {
  const {
    bucketName,
    path,
    allowedMimeTypes = [],
    maxFileSize = Number.POSITIVE_INFINITY,
    maxFiles = 1,
    upsert = true,
  } = options

  const [state, dispatch] = useReducer(reducer, initialState)
  const { files, loading, errors, successes, uploadedUrls, uploadedKeys } = state

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
        .map((file) =>
          Object.assign(file, {
            preview: URL.createObjectURL(file),
            errors: [] as FileError[],
          })
        )

      const invalidFiles = fileRejections.map(({ file, errors }) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
          errors,
        })
      )

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

          // /api/upload responds with { success, key, url }; url is the object's
          // public B2 URL. Capture it so callers don't have to
          // reconstruct (and potentially get wrong) the public URL themselves.
          let url: string | undefined
          let storedKey: string | undefined
          try {
            const body = await res.json()
            url = body?.url
            storedKey = typeof body?.key === 'string' ? body.key : undefined
          } catch {
            // No JSON body for some reason — fall back to
            // undefined; caller treats this as "upload succeeded, URL
            // unknown" (surfaced via a console.error in ImageUpload).
          }

          return { name: file.name, message: undefined, url, key: storedKey }
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
    uploadedKeys,
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

export { useUpload, type UseUploadOptions, type UseUploadReturn }