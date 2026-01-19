interface SecuritySettingsProps {
    slug: string
    userEmail: string
}
export const SecuritySettings = ({ slug, userEmail }: SecuritySettingsProps) => {
    return (
        <div>
            <h1>Security Settings</h1>
            <p>{slug}</p>
        </div>
    )
}