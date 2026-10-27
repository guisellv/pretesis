describe("Flujo 2: Creación de un grupo", () => {
  const usuario = {
    nombre: "Admin E2E",
    correo: `e2e_grupos_${Date.now()}@test.cl`,
    clave: "Password123!",
  };
  const nombreGrupo = `Grupo E2E ${Date.now()}`;

  before(() => {
    cy.registrarPorApi(usuario);
  });

  it("debe iniciar sesión, crear un grupo y ver sus integrantes", () => {
    // 1. Iniciar sesión
    cy.iniciarSesion(usuario.correo, usuario.clave);
    cy.contains("Todavía no tienes grupos.").should("be.visible");

    // 2. Crear el grupo
    cy.contains("button", "Crear grupo").click();
    cy.get(".modal-box input").type(nombreGrupo);
    cy.contains("button", "Guardar grupo").click();

    // 3. La barra lateral muestra solo Inicio, el nombre y los integrantes
    cy.get(".panel-sidebar").within(() => {
      cy.contains("button", "Inicio").should("be.visible");
      cy.contains(".group-title", nombreGrupo).should("be.visible");
      cy.contains("h3", "Integrantes").should("be.visible");
      cy.contains(".member-item", usuario.nombre).should("contain", "Administrador");
      cy.contains("button", "Crear grupo").should("not.exist");
    });

    // 4. Como administrador ve el código del grupo y el botón para crear reuniones
    cy.contains(".group-code-panel", "Código del grupo").should("be.visible");
    cy.contains("button", "Crear reunión").should("be.visible");

    // 5. Al volver a Inicio aparece el grupo en "Mis grupos"
    cy.contains("button", "Inicio").click();
    cy.contains(".group-item", nombreGrupo).should("be.visible");
  });
});
