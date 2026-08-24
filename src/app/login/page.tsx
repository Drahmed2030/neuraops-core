import LoginShell from './LoginShell'

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string }
}) {
  return <LoginShell error={searchParams?.error} />
}
