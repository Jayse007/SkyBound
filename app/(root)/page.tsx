import HeaderBox from '@/components/HeaderBox';
import TotalBalanceBox from '@/components/totalBalanceBox';
import RightSidebar from '@/components/RightSidebar';
import RecentTransactions from '@/components/RecentTransactions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getAccount, getAccounts } from '@/lib/actions/bank.actions';

const Home = async ({ searchParams  }: SearchParamProps) => {
  const loggedIn = await getLoggedInUser();

  let {id, page} = await searchParams;
  let accounts = await getAccounts({ userId: loggedIn?.$id});
  let currentPage = Number(page as string) || 1;

  if (!accounts) return;


  let accountsData = accounts?.data;
  let appwriteItemId = (id as string) || accounts?.data[0]?.appwriteItemId;
  let account = await getAccount({ appwriteItemId });

  

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
        
          <HeaderBox 
            type="greeting"
            title="Welcome"
            user= {`${loggedIn?.firstName} ${loggedIn?.lastName}` || 'Guest'}
            subtext= "Access and manage your account and \
            transactions efficiently."
          />
          
          <TotalBalanceBox 
            accounts={accountsData}
            totalBanks={accounts?.totalBanks}
            totalCurrentBalance={accounts?.totalCurrentBalance}
          />
        </header> 

        < RecentTransactions 
           accounts={accountsData}
           transactions={account?.transactions}
           appwriteItemId={appwriteItemId}
           page={currentPage}/>
      </div> 

      <RightSidebar 
         user={loggedIn}
         transactions={account?.transactions}
         banks={accountsData?.slice(0, 2)}/>
    </section>
  )
}

export default Home