import { Navigate, useLocation } from 'react-router-dom';
import type { SignupProfile, SignupProvider } from '../../api/signupApi';
import { ROUTES } from '../../routes';
import { SignupForm } from './SignupForm';
export function SocialSignup({ provider }: { provider: SignupProvider }) {
  const { state } = useLocation();
  const profile = state?.[`${provider}Info`] as SignupProfile | undefined;
  const registrationToken = state?.registrationToken as string | undefined;
  if (!profile || !registrationToken) return <Navigate replace to={ROUTES.login}/>;
  return <SignupForm key={registrationToken} provider={provider} profile={profile} registrationToken={registrationToken}/>;
}
