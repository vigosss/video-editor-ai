import type { RouteObject } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { lazy, Suspense } from 'react'

// 懒加载页面组件
const Landing = lazy(() => import('./pages/Landing'))
const Home = lazy(() => import('./pages/Home'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const Settings = lazy(() => import('./pages/Settings'))
const Templates = lazy(() => import('./pages/Templates'))

/** 页面加载占位 */
function PageLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
    </div>
  )
}

/** 路由配置 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoading />}>
            <Landing />
          </Suspense>
        ),
      },
      {
        path: 'create',
        element: (
          <Suspense fallback={<PageLoading />}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: 'projects',
        element: (
          <Suspense fallback={<PageLoading />}>
            <Projects />
          </Suspense>
        ),
      },
      {
        path: 'projects/:id',
        element: (
          <Suspense fallback={<PageLoading />}>
            <ProjectDetail />
          </Suspense>
        ),
      },
      {
        path: 'templates',
        element: (
          <Suspense fallback={<PageLoading />}>
            <Templates />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageLoading />}>
            <Settings />
          </Suspense>
        ),
      },
    ],
  },
]