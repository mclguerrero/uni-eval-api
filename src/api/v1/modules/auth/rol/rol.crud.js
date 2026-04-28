const { createCrudModule } = require('@common/crud/base');
const { createValidatedCrud } = require('@common/crud/base.validation');

const rol = createValidatedCrud(
  {
    name: 'rol',
    route: '/rol',
    displayName: 'Rol',
    schemaName: 'Rol',
  },
  {
    rules: {
      nombre: {
        alphaNumericSpanish: true,
        stringLength: { min: 1, max: 100 }
      },
    }
  }
);

const user_rol = createCrudModule({
  name: 'user_rol',
  route: '/user/rol',
  displayName: 'User Rol',
  schemaName: 'UserRol',
});

const prog = createCrudModule({
  name: 'prog',
  route: '/prog',
  displayName: 'Prog',
  schemaName: 'Prog',
});

const user_prog = createCrudModule({
  name: 'user_prog',
  route: '/user/prog',
  displayName: 'User Prog',
  schemaName: 'UserProg',
});

module.exports = {
  rol,
  user_rol,
  prog,
  user_prog,
};
