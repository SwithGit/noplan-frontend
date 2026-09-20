import { SignupForm } from './SignupForm';
export default function Signup({ onGoToLogin }: { onGoToLogin?: () => void }) {
  return <SignupForm onGoToLogin={onGoToLogin}/>;
}
