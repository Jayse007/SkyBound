"use server";

import { Client } from "dwolla-v2";
import { NextApiResponse } from "next";
import { extractCustomerIdFromUrl } from "../utils";

const getEnvironment = (): "production" | "sandbox" => {
  const environment = process.env.DWOLLA_ENV as string;

  switch (environment) {
    case "sandbox":
      return "sandbox";
    case "production":
      return "production";
    default:
      throw new Error(
        "Dwolla environment should either be set to `sandbox` or `production`"
      );
  }
};

const dwollaClient = new Client({
  environment: getEnvironment(),
  key: process.env.DWOLLA_KEY as string,
  secret: process.env.DWOLLA_SECRET as string,
});


async function getExchangeHref(): Promise<string> {
  const response = await dwollaClient.get("exchange-partners");
  const partnersList = response.body._embedded["exchange-partners"];
  
  // Explicitly check the name property
  const plaidPartner = partnersList.find(
    (obj: { name: string }) => obj.name === "Plaid"
  );

  if (!plaidPartner) {
    throw new Error("Plaid exchange partner not found in Dwolla account.");
  }

  return plaidPartner._links.self.href;
}


interface CreateExchangeOptions {
  customerId: string;
  token: string;
}

const createExchange = async (
  options: CreateExchangeOptions
): Promise<any> => {
  const exchangePartnerHref = await getExchangeHref();
  return (
    await dwollaClient.post(`customers/${options.customerId}/exchanges`, {
      _links: {
        "exchange-partner": {
          href: exchangePartnerHref,
        },
      },
      token: options.token,
    })
  ).headers.get("location");
}

// 4. Create a funding source using the exchange
interface CreateFundingSourceOptions {
  customerId: string;
  fundingSourceName: string;
  token: string;
  type: string | null;
}

export const createFundingSource = async (
  options: CreateFundingSourceOptions
): Promise<any> =>{
  const exchangeUrl = await createExchange({customerId: options.customerId, token: options.token});
  try {
    const response = await dwollaClient.post(`customers/${options.customerId}/funding-sources`, {
      _links: {
        exchange: {
          href: exchangeUrl,
        },
      },
      bankAccountType: options.type,
      name: options.fundingSourceName,
    })
  const data = response.headers.get("location");
  return data;
  }
  catch (error) {
    console.log("Funding Source Error:", error);
  }
}


export const createDwollaCustomer = async (
  newCustomer: NewDwollaCustomerParams
) => {
  try {
    return await dwollaClient
      .post("customers", newCustomer)
      .then((res) => res.headers.get("location"));
  } catch (err) {
    console.error("Creating a Dwolla Customer Failed: ", err);
  }
};

export const createTransfer = async ({
  sourceFundingSourceUrl,
  destinationFundingSourceUrl,
  amount,
}: TransferParams) => {
  try {
   
    const requestBody = {
      _links: {
        source: {
          href: sourceFundingSourceUrl,
        },
        destination: {
          href: destinationFundingSourceUrl,
        },
      },
      amount: {
        currency: "USD",
        value: amount,
      },
    };
    return await dwollaClient
      .post("transfers", requestBody)
      .then((res) => res.headers.get("location"));
  } catch (err) {
    console.error("Transfer fund failed: ", err);
  }
};





