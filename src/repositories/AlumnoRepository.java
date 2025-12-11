package asisweb.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import asisweb.models.Alumno;

public interface AlumnoRepository extends JpaRepository<Alumno, Long> {
    Alumno findByCorreo(String correo);
}
