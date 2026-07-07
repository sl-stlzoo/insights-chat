import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import SignInButton from '@/app/components/SignInButton';
import { authOptions } from '@/lib/auth';

export default async function SignInPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/insights-chat');
  }

  return (
    <main className="signin-page">
      <section className="signin-panel">
        <div className="signin-eyebrow">Saint Louis Zoo data workspace</div>
        <h1>Secure access to zd</h1>
        <p>
          Sign in with Microsoft Entra ID to access zd (pronounced zed), the MotherDuck-backed analysis
          experience, project documentation, and Azure deployment workflows.
        </p>
        <SignInButton />
        <div className="signin-note">
          This deployment is designed for tenant-backed access, Key Vault-managed
          secrets, and Azure Container Apps hosting.
        </div>
      </section>
    </main>
  );
}
