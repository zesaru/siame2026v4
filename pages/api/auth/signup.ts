import type { NextApiRequest, NextApiResponse } from "next"

// Simple in-memory user store for demonstration
const users = [
  {
    id: "1",
    name: "Demo User",
    email: "demo@example.com",
    password: "temp123"
  }
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Todos los campos son requeridos" })
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email === email)

    if (existingUser) {
      return res.status(400).json({ error: "El usuario ya existe" })
    }

    // Create new user (in memory for demo)
    const newUser = {
      id: (users.length + 1).toString(),
      name,
      email,
      password // In production, hash this!
    }

    users.push(newUser)

    return res.status(201).json({
      message: "Usuario creado exitosamente",
      userId: newUser.id
    })
  } catch (error) {
    console.error("Signup error:", error)
    return res.status(500).json({ error: "Error interno del servidor" })
  }
}