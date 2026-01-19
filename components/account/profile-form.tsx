interface ProfileFormProps {
    profile: any
    slug: string
    userEmail: string
}
export const ProfileForm = ({ profile, slug, userEmail }: ProfileFormProps) => {
    return (
        <div>
            <h1>Profile Form</h1>
            <p>{slug}</p>
        </div>
    )
}