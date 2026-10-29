import { handleApiRequest } from '../server/apiPlugin.js';

export default async function handler(req, res) {
  return handleApiRequest(req, res);
}
