import { API_BASE } from '../../../shared/services/apiClient';

const BASE = '/api/v1/measurements/export';

export async function downloadMeasurements(environmentId, variableId, from, to, format = 'csv') {
    const params = new URLSearchParams();
    params.set('environmentId', environmentId);
    if (variableId) params.set('variableId', variableId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('format', format);

    const url = `${API_BASE}${BASE}?${params.toString()}`;

    const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `Error ${response.status}`);
    }

    const blob = await response.blob();
    const ext = format === 'xlsx' ? 'xlsx' : 'csv';
    const filename = `measurements_${environmentId}_${from ? from.substring(0, 10) : 'all'}_${to ? to.substring(0, 10) : 'now'}.${ext}`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

export default { downloadMeasurements };
