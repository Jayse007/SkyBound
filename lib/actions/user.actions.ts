"use server";

import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { cookies } from "next/headers";
import { ID, Models, Query } from "node-appwrite";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
import { plaidClient } from "@/lib/plaid";
import { createDwollaCustomer, createFundingSource} from "./dwolla.actions";
import { revalidatePath } from "next/cache";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_ID: USER_ID,
  APPWRITE_BANK_ID: BANK_ID,
} = process.env


export const getUserInfo = async({ userId }: getUserInfoProps) => {
  try {
    const { tablesDB } = await createAdminClient();

    const user = await tablesDB.listRows({
      databaseId: DATABASE_ID!,
      tableId: USER_ID!,
      queries: [Query.equal("userId", [userId])]
    });

    return parseStringify(user.rows[0]);

  } catch (error) {
    console.log(error);
  }
}

export const signIn = async ({ email, password}: {email: string, password: string}) => {
  try {
    const { account } = await createAdminClient();
    const response = await account.createEmailPasswordSession({
      email,
      password
    });
    const cookie = await cookies();
     cookie.set("appwrite-session", response.secret, {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: true,
      });

    const user = await getUserInfo({
      userId: response.userId
    });


    return parseStringify(user);

  } catch (error) {
    return null;
  }
};

export const signUp = async ( { password, ...userData}: SignUpParams ) => {
  const { firstName, lastName, email } = userData;

  let newUserAccount;

  try {
     const { account, tablesDB } = await createAdminClient();

     newUserAccount = await account.create({
        userId: ID.unique(),
        email: email,
        password: password,
        name: `${firstName} ${lastName}`
     });
 
     if (!newUserAccount) throw new Error('Error creating user');

     const dwollaCustomerUrl = await createDwollaCustomer({
      ...userData,
      type: 'personal'
     })

     if (!dwollaCustomerUrl) throw new Error('Error creating Dwolla Customer');

     const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

     const newUser = await tablesDB.createRow({
      databaseId: DATABASE_ID!,
      tableId: USER_ID!,
      rowId: ID.unique(),
      data: {
        ...userData,
        userId: newUserAccount.$id,
        dwollaCustomerUrl,
        dwollaCustomerId
      }
     });

     const session = await account.createEmailPasswordSession({
        email,
        password
     });

     const cookie = await cookies();
     cookie.set("appwrite-session", session.secret, {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: true,
      });
      return parseStringify(newUser);
  } catch (error) {
    console.log(error);
    return null;
  }
};

// ... your initilization functions

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    const result =  await account.get();

    const user = await getUserInfo(({userId: result.$id}));

    return parseStringify(user);
  } catch (error) {
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    const {account } = await createSessionClient();
    const cookie = await cookies();
    cookie.delete("appwrite-session");

    await account.deleteSession({sessionId: "current"});
    return true;
  } catch (error) {
    return null;
  }
} 

export const createLinkToken = async (user: User) => {
  try {
    const tokenParams = {
      user: {
        client_user_id: user.$id
      },
      client_name: `SkyBound`,
      products: ['auth', 'transactions'] as Products[],
      language: 'en',
      country_codes: ['US'] as CountryCode[],
    };
    const response = await plaidClient.linkTokenCreate(tokenParams);
    


    return parseStringify({linkToken: response.data.link_token});

  } catch (error) {
    console.log(error);
  }
}

export const createBankAccount = async ({
  userId,
  bankId,
  accountId,
  accessToken,
  fundingSourceUrl,
  shareableId,
}: createBankAccountProps) => {
  try {
    const { tablesDB } = await createAdminClient();
    const bankAccount = await tablesDB.createRow({
      databaseId: DATABASE_ID!,
      tableId: BANK_ID!,
      rowId: ID.unique(),
      data:{
        userId,
        bankId,
        accountId,
        accessToken,
        fundingSourceUrl,
        shareableId
      }
    });

    return parseStringify(bankAccount);


  } catch (error) {
      console.log(error)
  }

}


export const exchangePublicToken = async ({ publicToken, user}: exchangePublicTokenProps) => {
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });


    const accountData = accountsResponse.data.accounts[0];
    const accountId = accountData.account_id;

    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken, 
      account_id: accountData.account_id,
      processor: ProcessorTokenCreateRequestProcessorEnum.Dwolla,
    };

    const processorTokenResponse = await plaidClient.processorTokenCreate(request);
    const processorToken = processorTokenResponse.data.processor_token;

    const fundingSourceUrl = await createFundingSource({
      customerId: user.dwollaCustomerId,
      token: processorToken,
      fundingSourceName: accountData.name,
      type: accountData.subtype
    })

    if ( !fundingSourceUrl ) throw Error;

    await createBankAccount({
      userId: user.$id,
      bankId: itemId,
      accountId,
      accessToken, 
      fundingSourceUrl,
      shareableId: encryptId(accountData.account_id),
    });

    revalidatePath('/');
    return parseStringify({publicTokenExchange: "complete"});
  } catch (error) {
    console.error("An error occurred while exchanging public token:", error);
  }
}


export const getBanks = async ({ userId }: getBanksProps) =>  {
  try {
    const { tablesDB } = await createAdminClient();

    const banks = await tablesDB.listRows({
      databaseId: DATABASE_ID!,
      tableId: BANK_ID!,
      queries: [Query.equal("userId", [userId])]
    });

    return parseStringify(banks.rows);

  } catch (error) {
    console.log(error);
  }
} 

export const getBank = async ({ bankId }: getBankProps) =>  {
  try {
    const { tablesDB } = await createAdminClient();

    const bank = await tablesDB.listRows({
      databaseId: DATABASE_ID!,
      tableId: BANK_ID!,
      queries: [Query.equal("$id", [bankId])]
    });

    return parseStringify(bank.rows[0]);

  } catch (error) {
    console.log(error);
  }
} 

export const getBankByAccountId = async ({accountId}: getBankByAccountIdProps) => {
  try {
    const { tablesDB } = await createAdminClient();

    const bank = await tablesDB.listRows({
      databaseId: DATABASE_ID!,
      tableId: BANK_ID!,
      queries: [Query.equal("accountId", [accountId])]
    });

    if (bank.total != 1) return null;

    return parseStringify(bank.rows[0]);

  } catch (error) {
    console.log(error);
  }
}
