export type FriendbotFundingResult = {
  status: "funded" | "pending_manual_funding";
  detail?: string;
};

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function fundTestnetAccount(
  friendbotBaseUrl: string,
  address: string,
): Promise<FriendbotFundingResult> {
  try {
    const friendbotUrl = new URL(friendbotBaseUrl);
    friendbotUrl.searchParams.set("addr", address);

    let lastStatus: number | null = null;
    let lastBody = "";

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await fetch(friendbotUrl.toString());
      lastStatus = response.status;
      lastBody = await response.text();

      if (response.ok) {
        return {
          status: "funded",
        };
      }

      if (response.status >= 500 && attempt < 3) {
        await wait(attempt * 400);
        continue;
      }

      break;
    }

    return {
      status: "pending_manual_funding",
      detail:
        lastBody.trim().length > 0
          ? `Friendbot returned status ${lastStatus}: ${lastBody.trim()}`
          : `Friendbot returned status ${lastStatus}`,
    };
  } catch (error) {
    return {
      status: "pending_manual_funding",
      detail: error instanceof Error ? error.message : "Friendbot request failed",
    };
  }
}
