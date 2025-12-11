package asisweb.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import asisweb.models.Alumno;
import asisweb.repositories.AlumnoRepository;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class AlumnoController {

    @Autowired
    private AlumnoRepository alumnoRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Registro de alumno
    @PostMapping("/register-alumno")
    public String registrarAlumno(@RequestBody Alumno alumno) {
        try {
            // Cifrar contraseña antes de guardar
            String hash = passwordEncoder.encode(alumno.getPassword());
            alumno.setPassword(hash);

            alumnoRepository.save(alumno);
            return "{\"success\": true}";
        } catch (Exception e) {
            return "{\"success\": false, \"error\": \"" + e.getMessage() + "\"}";
        }
    }

    // Inicio de sesión de alumno
    @PostMapping("/login-alumno")
    public String loginAlumno(@RequestBody Alumno datos) {
        try {
            Alumno alumno = alumnoRepository.findByCorreo(datos.getCorreo());
            if (alumno == null) {
                return "{\"success\": false, \"error\": \"Usuario no encontrado\"}";
            }

            boolean coincide = passwordEncoder.matches(
                datos.getPassword(),
                alumno.getPassword()
            );

            if (!coincide) {
                return "{\"success\": false, \"error\": \"Contraseña incorrecta\"}";
            }

            return "{\"success\": true}";
        } catch (Exception e) {
            return "{\"success\": false, \"error\": \"" + e.getMessage() + "\"}";
        }
    }
}
