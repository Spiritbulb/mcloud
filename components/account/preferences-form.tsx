interface PreferencesFormProps {
    preferences: any
    slug: string
}
export const PreferencesForm = ({ preferences, slug }: PreferencesFormProps) => {
    return (
        <div>
            <h1>Preferences Form</h1>
            <p>{slug}</p>
        </div>
    )
}