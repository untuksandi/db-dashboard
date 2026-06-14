import { google } from 'googleapis'

function getOAuth2Client() {
  const clientId = process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive OAuth credentials not configured')
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret)
  oauth2.setCredentials({ refresh_token: refreshToken })
  return oauth2
}

export type DriveFile = {
  fileId: string
  name: string
  content: string
  modifiedTime: string
  webViewLink: string
}

export async function fetchRecentDriveFiles(sinceDate: Date): Promise<DriveFile[]> {
  const folderId = process.env.GDRIVE_FOLDER_ID
  if (!folderId) throw new Error('GDRIVE_FOLDER_ID not configured')

  const auth = getOAuth2Client()
  const drive = google.drive({ version: 'v3', auth })

  const modifiedAfter = sinceDate.toISOString()

  const listRes = await drive.files.list({
    q: `'${folderId}' in parents and modifiedTime > '${modifiedAfter}' and trashed = false`,
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
    pageSize: 50,
  })

  const files = listRes.data.files ?? []
  const results: DriveFile[] = []

  for (const file of files) {
    if (!file.id || !file.name) continue

    // Only process document types we can extract text from
    const isDocx =
      file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimeType === 'application/vnd.google-apps.document'

    if (!isDocx) continue

    try {
      const content = await exportFileContent(drive, file.id, file.mimeType ?? '')
      results.push({
        fileId: file.id,
        name: file.name,
        content,
        modifiedTime: file.modifiedTime ?? new Date().toISOString(),
        webViewLink: file.webViewLink ?? '',
      })
    } catch {
      // Skip files that fail to export
    }
  }

  return results
}

async function exportFileContent(
  drive: ReturnType<typeof google.drive>,
  fileId: string,
  mimeType: string
): Promise<string> {
  if (mimeType === 'application/vnd.google-apps.document') {
    // Export Google Doc as plain text
    const res = await drive.files.export(
      { fileId, mimeType: 'text/plain' },
      { responseType: 'text' }
    )
    return typeof res.data === 'string' ? res.data : ''
  } else {
    // For .docx, download and convert (simplified: return metadata)
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'text' }
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: unknown = (res as any).data
    return typeof raw === 'string' ? raw.slice(0, 5000) : ''
  }
}
