import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import { package_addr } from "../package";

export const buyTicket = (
    pool: string,
    _in_coin: unknown,
    ticketPrice: number,  // per-ticket price in MIST
    pPrice: number,       // user's predicted price (scaled 1e9)
    sender: string,
    quantity: number = 1,
) => {
    const tx = new Transaction();
    tx.setSender(sender);

    for (let i = 0; i < quantity; i++) {
        const con = coinWithBalance({ balance: ticketPrice });
        tx.moveCall({
            target: `${package_addr}::suipredict::buy_ticket`,
            arguments: [
                tx.object(pool),
                con,
                tx.pure.u64(pPrice),
            ]
        });
    }

    return tx;
};
