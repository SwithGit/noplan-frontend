import { Navigate } from 'react-router-dom';
import { ROUTES } from '../routes';

export default function Chatbot() {
  return <Navigate replace to={ROUTES.plannerChat} />;
}
