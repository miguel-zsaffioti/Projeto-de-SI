declare global {
  namespace Express {
    interface Request {
      administradorId?: bigint
    }
  }
}

export {}
