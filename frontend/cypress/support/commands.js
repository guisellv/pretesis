// Registra un usuario directo en la API, para no repetir el formulario en cada flujo
Cypress.Commands.add("registrarPorApi", (usuario) => {
  cy.request("POST", "/api/auth/registro", usuario);
});

// Inicia sesión desde el formulario, como lo haría un usuario real
Cypress.Commands.add("iniciarSesion", (correo, clave) => {
  cy.visit("/");
  cy.get('input[type="email"]').type(correo);
  cy.get('input[type="password"]').type(clave);
  cy.contains("button", "Entrar").click();
});
