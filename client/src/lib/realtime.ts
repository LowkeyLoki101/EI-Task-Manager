export type RealtimeSession = {
  client_secret?: { value: string };
  id?: string;
};

export async function createRealtimeSession(): Promise<RealtimeSession> {
  const r = await fetch("/api/realtime/session", { method: "POST" });
  if (!r.ok) throw new Error(`session http ${r.status}`);
  return r.json();
}

export async function connectRealtime(token: string) {
  // Create RTCPeerConnection
  const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

  // Play remote audio
  const audioEl = document.createElement("audio");
  audioEl.autoplay = true;
  pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

  // Mic capture
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));

  // Create SDP offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Send offer to OpenAI Realtime REST endpoint using the client token
  const baseUrl = "https://api.openai.com/v1/realtime";
  const model = "gpt-4o-realtime-preview"; // keep in sync with server

  const sdpResp = await fetch(`${baseUrl}?model=${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/sdp",
    },
    body: offer.sdp as any,
  });

  const answer = { type: "answer", sdp: await sdpResp.text() } as RTCSessionDescriptionInit;
  await pc.setRemoteDescription(answer);

  return { pc, stream, audioEl };
}