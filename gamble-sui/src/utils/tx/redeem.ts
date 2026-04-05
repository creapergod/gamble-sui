import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";

export const redeem = (ticket: string, pool: string) => {
    const tx = new Transaction();
    tx.moveCall({
        target: `${package_addr}::suipredict::redeem`,
        arguments: [
            tx.object(ticket),
            tx.object(pool)
        ]
    });
    return tx;
};

export const redeemBatch = (tickets: { ticketId: string; poolId: string }[]) => {
    const tx = new Transaction();
    for (const { ticketId, poolId } of tickets) {
        tx.moveCall({
            target: `${package_addr}::suipredict::redeem`,
            arguments: [
                tx.object(ticketId),
                tx.object(poolId),
            ]
        });
    }
    return tx;
};
