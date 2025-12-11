package asisweb.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import asisweb.models.Profesor;
import asisweb.repositories.ProfesorRepository;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ProfesorController {

    @Autowired
    private ProfesorRepository profesorRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Registro de profesor
    @PostMapping("/register-profesor")
    public String registrarProfesor(@RequestBody Profesor profesor) {
        try {
            // Encriptar la contraseña antes de guardar
            String hash = passwordEncoder.encode(profesor.getPassword());
            profesor.setPassword(hash);

            profesorRepository.save(profesor);
            return "{\"success\": true}";
        } catch (Exception e) {
            return "{\"success\": false, \"error\": \"" + e.getMessage() + "\"}";
        }
    }

    // Inicio de sesión de profesor
    @PostMapping("/login-profesor")
    public String loginProfesor(@RequestBody Profesor datos) {
        try {
            Profesor profesor = profesorRepository.findByCorreo(datos.getCorreo());
            if (profesor == null) {
                return "{\"success\": false, \"error\": \"Usuario no encontrado\"}";
            }

            boolean coincide = passwordEncoder.matches(
                datos.getPassword(),
                profesor.getPassword()
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
