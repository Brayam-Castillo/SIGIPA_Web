package sigipa.modelo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

/**
 * Representa un insumo de la tabla inventario de SIGIPA.
 */
@Entity
@Table(name = "inventario")
public class Inventario {

    // Identificador generado por el AUTO_INCREMENT de MariaDB.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_inventario")
    private int idInventario;

    @Column(name = "nombre_insumo", nullable = false, length = 50)
    private String nombreInsumo;

    @Column(name = "cantidad_disponible", nullable = false,
            precision = 8, scale = 2)
    private BigDecimal cantidadDisponible;

    @Column(name = "unidad", nullable = false, length = 15)
    private String unidad;

    @Column(name = "nivel_minimo", nullable = false,
            precision = 8, scale = 2)
    private BigDecimal nivelMinimo;

    // Constructor sin parámetros utilizado por Hibernate.
    public Inventario() {
    }

    public Inventario(int idInventario, String nombreInsumo,
            BigDecimal cantidadDisponible, String unidad,
            BigDecimal nivelMinimo) {
        this.idInventario = idInventario;
        this.nombreInsumo = nombreInsumo;
        this.cantidadDisponible = cantidadDisponible;
        this.unidad = unidad;
        this.nivelMinimo = nivelMinimo;
    }

    public int getIdInventario() {
        return idInventario;
    }

    public void setIdInventario(int idInventario) {
        this.idInventario = idInventario;
    }

    public String getNombreInsumo() {
        return nombreInsumo;
    }

    public void setNombreInsumo(String nombreInsumo) {
        this.nombreInsumo = nombreInsumo;
    }

    public BigDecimal getCantidadDisponible() {
        return cantidadDisponible;
    }

    public void setCantidadDisponible(BigDecimal cantidadDisponible) {
        this.cantidadDisponible = cantidadDisponible;
    }

    public String getUnidad() {
        return unidad;
    }

    public void setUnidad(String unidad) {
        this.unidad = unidad;
    }

    public BigDecimal getNivelMinimo() {
        return nivelMinimo;
    }

    public void setNivelMinimo(BigDecimal nivelMinimo) {
        this.nivelMinimo = nivelMinimo;
    }
}
