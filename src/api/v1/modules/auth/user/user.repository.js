const { userPrisma } = require('@config/prisma'); 

class UserRepository {
  constructor() {
    this.model = userPrisma.vista_academica_insitus;
  }

  findMateriasByEstudiante(ID_ESTUDIANTE) {
    return this.model.findMany({
      where: { ID_ESTUDIANTE },
      orderBy: { ID_PERIODO: 'asc' }
    });
  }

  findMateriasByDocente(ID_DOCENTE) {
    return this.model.findMany({
      where: { ID_DOCENTE },
      orderBy: { ID_PERIODO: 'asc' }
    });
  }
}

module.exports = UserRepository;
