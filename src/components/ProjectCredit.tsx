import { PROJECT_NOTICE } from "../projectIdentity";

export function ProjectCredit() {
  return (
    <p className="project-credit">
      <strong>Creado por un compañero para nuestro equipo.</strong>
      <span>{PROJECT_NOTICE}</span>
    </p>
  );
}
