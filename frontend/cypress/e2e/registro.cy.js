describe("Flujo 1: Registro de usuario", () => {
  const usuario = {
    nombre: "Usuario E2E",
    correo: `e2e_registro_${Date.now()}@test.cl`,
    clave: "Password123!",
  };

  it("debe registrar un usuario nuevo e iniciar sesión con esa cuenta", () => {
    // 1. Abrir el formulario de registro
    cy.visit("/");
    cy.contains("button", "Crear una cuenta").click();
    cy.contains("h2", "Crear cuenta").should("be.visible");

    // 2. Completar y enviar el registro
    cy.get('input[type="text"]').type(usuario.nombre);
    cy.get('input[type="email"]').type(usuario.correo);
    cy.get('input[type="password"]').type(usuario.clave);
    cy.contains("button", "Registrarse").click();

    cy.contains(".auth-message", "Usuario registrado").should("be.visible");
    cy.contains("h2", "Iniciar sesión").should("be.visible");

    // 3. Iniciar sesión con la cuenta recién creada
    cy.get('input[type="email"]').clear().type(usuario.correo);
    cy.get('input[type="password"]').type(usuario.clave);
    cy.contains("button", "Entrar").click();

    // 4. Llegar al panel
    cy.get(".panel-sidebar").should("be.visible");
    cy.contains("h3", "Mis grupos").should("be.visible");
    cy.contains("Todavía no tienes grupos.").should("be.visible");
  });
});
