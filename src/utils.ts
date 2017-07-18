import { readFile, readFileSync, existsSync } from 'fs'
import { resolve, join as joinPaths, dirname, extname } from 'path'
import { buildSchema, buildClientSchema } from 'graphql'
import * as minimatch from 'minimatch'
import * as yaml from 'js-yaml'

import { GraphQLConfigData } from './types'

export const GRAPHQL_CONFIG_NAME = '.graphqlrc'
export const GRAPHQL_CONFIG_YAML_NAME = '.graphqlrc.yaml'

function isRootDir(path: string): boolean {
  return dirname(path) === path
}

export function findConfigPath(filePath: string): string {
  filePath = resolve(filePath)

  if (
    filePath.endsWith(GRAPHQL_CONFIG_NAME) ||
    filePath.endsWith(GRAPHQL_CONFIG_YAML_NAME)
  ) {
    return filePath
  }

  let currentDir = filePath
  while (!isRootDir(currentDir)) {
    const configPath = joinPaths(currentDir, GRAPHQL_CONFIG_NAME)
    if (existsSync(configPath)) {
      return configPath
    }
    if (existsSync(configPath + '.yaml')) {
      return configPath + '.yaml'
    }
    currentDir = dirname(currentDir)
  }

  throw new Error(
    `'${GRAPHQL_CONFIG_NAME} file is not available in the provided config ` +
    `directory: ${filePath}\nPlease check the config directory path and try again.`
  )
}

export function readConfig(configPath: string): GraphQLConfigData {
  let config
  try {
    const rawConfig = readFileSync(configPath, 'utf-8')
    if (configPath.endsWith('.yaml')) {
      config = yaml.safeLoad(rawConfig)
    } else {
      config = JSON.parse(rawConfig)
    }
  } catch (error) {
    error.message = `Parsing ${configPath} file has failed.\n` + error.message
    throw error
  }

  return config
}

export function matchesGlobs(filePath: string, globs?: string[]): boolean {
  return (globs || []).some(
    glob => minimatch(filePath, glob, {matchBase: true})
  )
}

export function validateConfig(config: GraphQLConfigData) {
  // FIXME: implement
}

export function mergeConfigs(
  dest: GraphQLConfigData,
  src: GraphQLConfigData
): GraphQLConfigData {
  const result = { ...dest, ...src }
  if (dest.extensions && src.extensions) {
    result.extensions = { ...dest.extensions, ...src.extensions }
  }
  if (dest.projects && src.projects) {
    result.projects = { ...dest.projects, ...src.projects }
  }
  return result
}

export function readSchema(path) {
  return new Promise((resolve, reject) => {
    readFile(path, 'utf-8', (error, data) => {
      error ? reject(error) : resolve(data)
    })
  }).then((data: string) => {
    // FIXME: prefix error
    switch (extname(path)) {
      case '.graphql':
        return buildSchema(data)
      case '.json':
        return buildClientSchema(JSON.parse(data).data)
      default:
        throw new Error('Unsupported schema file extention. Only ".graphql" and ".json" are supported')
    }
  })
}
