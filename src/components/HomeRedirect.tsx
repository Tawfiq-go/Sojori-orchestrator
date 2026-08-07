import { Navigate } from 'react-router-dom';

/**
 * Landing `/` → toujours Ma journée (URL canonique : /ma-journee).
 */
export function HomeRedirect() {
  return <Navigate to="/ma-journee" replace />;
}

export default HomeRedirect;
