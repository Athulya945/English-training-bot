export async function playVoiceChat(messages: { role: string; content: string }[]) {
  const res = await fetch("/api/voicechat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    throw new Error("VoiceChat API failed");
  }

  const audioBlob = await res.blob(); 
  const audioUrl = URL.createObjectURL(audioBlob);

  const audio = new Audio(audioUrl);
  audio.play();
}
