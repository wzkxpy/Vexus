// src/main/container.ts

class ServiceContainer {
  private services = new Map<string, any>()

  register<T>(name: string, instance: T) {
    this.services.set(name, instance)
  }

  get<T>(name: string): T {
    const service = this.services.get(name)
    if (!service) {
      throw new Error(`Service ${name} not found`)
    }
    return service
  }
}

export const container = new ServiceContainer()