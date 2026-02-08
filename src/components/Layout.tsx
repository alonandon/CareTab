import { Outlet } from 'react-router-dom'
import { BottomNav, SideNav } from './BottomNav'

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Skip link for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Sidebar — desktop only */}
      <SideNav />

      {/* Main content */}
      <main
        id="main-content"
        className="flex-1 pb-20 lg:pb-6 px-4 pt-4 lg:px-8 lg:pt-6 mx-auto w-full max-w-lg md:max-w-2xl lg:max-w-4xl"
        role="main"
      >
        <Outlet />
      </main>

      {/* Bottom nav — mobile + tablet */}
      <BottomNav />
    </div>
  )
}
