/**
 * IoC Container for TSOA Dependency Injection
 * This allows TSOA to instantiate controllers with dependencies
 */
class IocContainer {
    constructor() {
        this.services = new Map();
    }

    /**
     * Register a service in the container
     * @param {string} name - Service name
     * @param {any} service - Service instance or class
     */
    register(name, service) {
        this.services.set(name, service);
    }

    /**
     * Get a service from the container
     * @param {any} controller - Controller class
     * @returns {any} Controller instance
     */
    get(controller) {
        // For now, just instantiate the controller
        // You can add more sophisticated DI logic here
        return new controller();
    }
}

const iocContainer = new IocContainer();

module.exports = { iocContainer };
