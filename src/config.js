import { ALIASES, DEFAULT_POT_OUTPUT, DEFAULT_HEADERS, POLYGLOT_LOCALE_ENV } from './defaults';
import Ajv from 'ajv';
import gettext from './extractors/gettext';
import ngettext from './extractors/ngettext';

const DEFAULT_EXTRACTORS = [gettext, ngettext];

const extractConfigSchema = {
    type: 'object',
    properties: {
        output: { type: 'string' },
        headers: {
            properties: {
                'content-type': { type: 'string' },
                'plural-forms': { type: 'string' },
            },
            additionalProperties: false,
        },
    },
    additionalProperties: false,
};

const resolveConfigSchema = {
    type: 'object',
    properties: {
        locales: {
            type: 'object',
            additionalProperties: { type: 'string' },
        },
    },
};

const configSchema = {
    type: 'object',
    properties: {
        extract: extractConfigSchema,
        resolve: resolveConfigSchema,
    },
    additionalProperties: false,
};

class ConfigValidationError extends Error {}
class ConfigError extends Error {}

function validateConfig(config, schema) {
    const ajv = new Ajv({ allErrors: true, verbose: true, v5: true });
    const isValid = ajv.validate(schema, config);
    return [isValid, ajv.errorsText(), ajv.errors];
}

class Config {
    constructor(config = {}) {
        this.config = config;
        const [validationResult, errorsText] = validateConfig(this.config, configSchema);
        if (!validationResult) {
            throw new ConfigValidationError(errorsText);
        }
    }

    getAliasFor(funcName) {
        // TODO: implement possibility to overwrite or add aliases in config;
        const aliases = ALIASES;
        for (const k of Object.keys(aliases)) {
            if (aliases[k] === funcName) {
                return k;
            }
        }
        throw new ConfigError(`Alias for function ${funcName} was not found ${JSON.stringify(aliases)}`);
    }

    getExtractors() {
        // TODO: implement possibility to specify additional extractors in config;
        return DEFAULT_EXTRACTORS;
    }

    getNPlurals() {
        const headers = (this.config.extract && this.config.extract.headers) || DEFAULT_HEADERS;
        const nplurals = /nplurals ?= ?(\d)/.exec(headers['plural-forms'])[1];
        return nplurals;
    }

    getOutputFilepath() {
        return (this.config.extract && this.config.extract.output) || DEFAULT_POT_OUTPUT;
    }

    getCurrentLocale() {
        const localeFromEnv = process.env[POLYGLOT_LOCALE_ENV];
        if (localeFromEnv) {
            return localeFromEnv;
        }
        // TODO: handle case if user wants to resolve without any locale in config;
        const firstFromConfig = Object.keys(this.config.resolve.locales)[0];
        return firstFromConfig;
    }

    getPoFilePath() {
        const locale = this.getCurrentLocale();
        return this.config.resolve.locales[locale];
    }
}

export default Config;
