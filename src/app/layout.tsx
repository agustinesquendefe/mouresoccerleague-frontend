import "./global.css"
import type { ReactNode } from 'react'

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/orf2jwd.css" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}