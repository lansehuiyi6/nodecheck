import React, { useState, useEffect } from 'react';
import Web3 from 'web3';

// 以太坊节点列表
const ethNodes = [
  'https://rpc.ankr.com/eth',
  'https://endpoints.omniatech.io/v1/eth/mainnet/public',
  'https://ethereum.publicnode.com'
];

// 合约地址
const contractAddress = '0xb8460Eeaa06Bc6668dad9fd42B661C0B96b3bE57';
const contractAbi = require('./abi/abi.CrossDelegate.json');

// 查询最近的区块事件
const queryContractEvents = async (web3, blockNumber) => {
  const contract = new web3.eth.Contract(contractAbi, contractAddress);
  const events = await contract.getPastEvents('allEvents', {
    fromBlock: blockNumber,
    toBlock: 'latest'
  });
  return events.length;
};

const EthNodeStatus = () => {
  const [nodeStatus, setNodeStatus] = useState([]);

  useEffect(() => {
    const fetchNodeStatus = async () => {
      const statusPromises = ethNodes.map(async (node, index) => {
        try {
          const web3 = new Web3(new Web3.providers.HttpProvider(node));
          const blockStartTime = new Date().getTime();
          const blockNumber = await web3.eth.getBlockNumber();
          const blockEndTime = new Date().getTime();
          const blockTimeTaken = blockEndTime - blockStartTime;

          const eventStartTime = new Date().getTime();
          const length = await queryContractEvents(web3, blockNumber);
          const eventEndTime = new Date().getTime();
          const eventTimeTaken = eventEndTime - eventStartTime;

          return {
            nodeIndex: index + 1,
            rpcServerAddress: node,
            blockNumber: blockNumber.toString(),
            blockTimeTaken: blockTimeTaken,
            eventLength: length,
            eventTimeTaken: eventTimeTaken
          };
        } catch (err) {
          return {
            nodeIndex: index + 1,
            rpcServerAddress: node,
            error: err.message ? err.message : err
          };
        }
      });

      const nodeStatus = await Promise.all(statusPromises);
      setNodeStatus(nodeStatus);
    };

    fetchNodeStatus();
  }, []);

  return (
    <div>
      <h2>RPC URL List</h2>
      <table className="node-status-table">
        <thead>
          <tr>
            <th>RPC Server Address</th>
            <th>Height</th>
            <th>Block Latency</th>
            <th>Event Length</th>
            <th>Event Latency</th>
          </tr>
        </thead>
        <tbody>
          {nodeStatus.length === 0 ? (
            <tr>
              <td colSpan="5">Loading...</td>
            </tr>
          ) : (
            nodeStatus.map((status) => (
              <tr key={status.nodeIndex}>
                <td>{status.rpcServerAddress}</td>
                {status.error ? (
                  <td colSpan="4">Error: {status.error}</td>
                ) : (
                  <>
                    <td>{status.blockNumber}</td>
                    <td>{status.blockTimeTaken} ms</td>
                    <td>{status.eventLength}</td>
                    <td>{status.eventTimeTaken} ms</td>
                  </>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

const App = () => {
  return (
    <div>
      <EthNodeStatus />
    </div>
  );
};

export default App;
