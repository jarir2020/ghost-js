export function createResourceEnvelope(data = {}, { resource = 'resource', baseUrl = '/api', meta = {} } = {}) {
    const id = data.id ?? null;
    const links = {
        self: id ? `${baseUrl.replace(/\/$/, '')}/${resource}/${id}` : `${baseUrl.replace(/\/$/, '')}/${resource}`
    };

    return {
        data,
        links,
        meta
    };
}

export function createApiResponse(payload = {}, { status = 200, message = 'OK', meta = {}, errors = [] } = {}) {
    return {
        ok: status >= 200 && status < 400,
        status,
        message,
        data: payload,
        meta,
        errors
    };
}

export function createPaginatedResponse(items = [], { page = 1, perPage = 15, total = items.length } = {}) {
    return {
        data: items,
        meta: {
            page,
            perPage,
            total,
            totalPages: perPage > 0 ? Math.max(1, Math.ceil(total / perPage)) : 1
        }
    };
}
