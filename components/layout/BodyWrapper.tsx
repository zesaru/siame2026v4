interface BodyWrapperProps {
  children: React.ReactNode
}

export default function BodyWrapper({ children }: BodyWrapperProps) {
  return (
    <body>
      {children}
    </body>
  )
}