import { existsSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const projectDir = dirname(fileURLToPath(import.meta.url))
const workspaceDir = dirname(projectDir)
const nextPackagePath = join(projectDir, 'node_modules/next/package.json')
const nextPackageRealPath = existsSync(nextPackagePath)
	? realpathSync(nextPackagePath)
	: ''
const projectRoot = nextPackageRealPath.startsWith(projectDir)
	? projectDir
	: workspaceDir

const nextConfig: NextConfig = {
	turbopack: {
		root: projectRoot
	}
}

export default nextConfig
