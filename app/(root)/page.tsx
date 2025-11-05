import HeaderBox from '@/components/HeaderBox';
import TotalBalanceBox from '@/components/totalBalanceBox';
import RightSidebar from '@/components/RightSidebar';

const Home = () => {
  const loggedIn = { firstName: 'Adrian', lastName: 'Cyrus', email:'Cyruse@gmail.com'};

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
        
          <HeaderBox 
            type="greeting"
            title="Welcome"
            user= {loggedIn?.firstName || 'Guest'}
            subtext= "Access and manage your accournt and \
            transactions efficiently."
          />
          
          <TotalBalanceBox 
            accounts={[]}
            totalBanks={1}
            totalCurrentBalance={1250.05}
          />
        </header> 

        RECENT TRANSACTIONS
      </div>

      <RightSidebar 
         user={loggedIn}
         transactions={[]}
         banks={[{ currentBalance: 1203.50, id: "second" }, { currentBalance: 1000.21, id: "first" }]}/>
    </section>
  )
}

export default Home