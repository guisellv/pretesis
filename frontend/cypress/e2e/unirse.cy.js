describe("Flujo 3: Unirse a un grupo", () => {
  const sufijo = Date.now();
  const admin = {
    nombre: "Admin E2E",
    correo: `e2e_unirse_admin_${sufijo}@test.cl`,
    clave: "Password123!",
  };
  const miembro = {
    nombre: "Miembro E2E",
    correo: `e2e_unirse_miembro_${sufijo}@test.cl`,
    clave: "Password123!",
  };
  const nombreGrupo = `Grupo Unirse ${sufijo}`;
  const codigoGrupo = Array.from({ length: 5 }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]
  ).join("");

  before(() => {
    cy.registrarPorApi(admin);
    cy.request("POST", "/api/auth/login", { correo: admin.correo, clave: admin.clave }).then(
      ({ body }) => {
        cy.request({
          method: "POST",
          url: "/api/grupos",
          headers: { Authorization: `Bearer ${body.token}` },
          body: { nombre: nombreGrupo, codigo_acceso: codigoGrupo },
        });
      }
    );

    cy.registrarPorApi(miembro);
  });

  it("debe iniciar sesión, unirse con el código y aparecer como integrante", () => {
    cy.iniciarSesion(miembro.correo, miembro.clave);
    cy.contains("Todavía no tienes grupos.").should("be.visible");

    cy.contains("button", "Unirse a un grupo").click();
    cy.get(".modal-box input").type(codigoGrupo);
    cy.contains("button", "Unirme").click();

    cy.get(".panel-sidebar").within(() => {
      cy.contains(".group-title", nombreGrupo).should("be.visible");
      cy.contains(".member-item", admin.nombre).should("contain", "Administrador");
      cy.contains(".member-item", miembro.nombre).should("contain", "Lector");
    });

    cy.contains("button", "Crear reunión").should("not.exist");
    cy.contains(".group-code-panel", "Código del grupo").should("not.exist");
  });

  it("debe mostrar un error si el código no existe", () => {
    cy.iniciarSesion(miembro.correo, miembro.clave);

    cy.contains("button", "Unirse a un grupo").click();
    cy.get(".modal-box input").type("00000");
    cy.contains("button", "Unirme").click();

    cy.contains(".form-error", "El código no es válido").should("be.visible");
  });
});
