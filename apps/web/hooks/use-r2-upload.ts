import { useCallback, useEffect, useMemo, useState } from 'react'
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

const useR2Upload = (options: UseR2UploadOptions) => {
  const {
    bucketName,
    path,
    allowedMimeTypes = [],
    maxFileSize = Number.POSITIVE_INFINITY,
    maxFiles = 1,
    upsert = true,
  } = options

  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([])
  const [successes, setSuccesses] = useState<string[]>([])

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

      setFiles(newFiles)
    },
    [files, setFiles]
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
    setLoading(true)

    // Same partial-retry behavior as the Supabase version:
    // if any files errored, retrying only re-attempts those + not-yet-successful ones
    const filesWithErrors = errors.map((x) => x.name)
    const filesToUpload =
      filesWithErrors.length > 0
        ? [
            ...files.filter((f) => filesWithErrors.includes(f.name)),
            ...files.filter((f) => !successes.includes(f.name)),
          ]
        : files

    const responses = await Promise.all(
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

          return { name: file.name, message: undefined }
        } catch (err) {
          return { name: file.name, message: err instanceof Error ? err.message : 'Upload failed' }
        }
      })
    )

    const responseErrors = responses.filter((x) => x.message !== undefined) as { name: string; message: string }[]
    setErrors(responseErrors)

    const responseSuccesses = responses.filter((x) => x.message === undefined)
    const newSuccesses = Array.from(
      new Set([...successes, ...responseSuccesses.map((x) => x.name)])
    )
    setSuccesses(newSuccesses)

    setLoading(false)
  }, [files, path, bucketName, errors, successes, upsert])

  useEffect(() => {
    if (files.length === 0) {
      setErrors([])
    }

    // If the number of files doesn't exceed the maxFiles parameter, remove the error 'Too many files' from each file
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
        setFiles(newFiles)
      }
    }
  }, [files.length, setFiles, maxFiles])

  return {
    files,
    setFiles,
    successes,
    isSuccess,
    loading,
    errors,
    setErrors,
    onUpload,
    maxFileSize: maxFileSize,
    maxFiles: maxFiles,
    allowedMimeTypes,
    ...dropzoneProps,
  }
}

export { useR2Upload, type UseR2UploadOptions, type UseR2UploadReturn }