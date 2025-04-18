import "@rainbow-me/rainbowkit/styles.css";
import {
  ConnectButton
} from "@rainbow-me/rainbowkit";
import StarBorder from "@/components/ui/starBorder";
import { Button } from "@/components/ui/button";


const Custombutton = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <>
                    <Button
                      className="w-fit p-3 px-8 bg-gray-600 hover:bg-gray-700"
                      onClick={openConnectModal}
                      type="button"
                    >
                      Connect Wallet
                    </Button>
                  </>
                );
              }

              if (chain.unsupported) {
                return (
                  <>
                    <Button
                      className=" w-fit p-3 px-8 bg-red-500 hover:bg-red-600"
                      onClick={openChainModal}
                      type="button"
                    >
                      Wrong network
                    </Button>
                  </>
                );
              }

              return (
                <div className="">
                  <Button
                    className="w-fit p-3 px-8 bg-gray-600 hover:bg-gray-700"
                    onClick={openAccountModal}
                    type="button"
                  >
                    {account.displayName}
                    {account.displayBalance
                      ? ` (${account.displayBalance})`
                      : ""}
                  </Button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default Custombutton;