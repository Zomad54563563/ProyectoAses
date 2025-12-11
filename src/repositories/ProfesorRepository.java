package asisweb.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import asisweb.models.Profesor;

public interface ProfesorRepository extends JpaRepository<Profesor, Long> {
    Profesor findByCorreo(String correo);
}
