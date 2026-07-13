type Payload = {
  teamId?: string;
  title: string;
  description?: string;
};

export async function execute(payload: Payload) {
  if (!payload.teamId) throw new Error("teamId is required");

  return {
    id: `lin_${Date.now()}`,
    teamId: payload.teamId,
    title: payload.title,
    description: payload.description ?? "",
  };
}
