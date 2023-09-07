import React, { useState, useEffect } from 'react';
import Web3 from 'web3';

import './App.css';

const contractAbi = require('./abi/abi.CrossDelegate.json');

// 读取本地json文件的函数
const readLocalJsonFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        resolve(json);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsText(file);
  });
};

// 查询最近的区块事件
const queryContractEvents = async (web3, blockNumber, contractAddress) => {
  const contract = new web3.eth.Contract(contractAbi, contractAddress);
  const events = await contract.getPastEvents('allEvents', {
    fromBlock: (parseInt(blockNumber) - 1000).toString(),
    toBlock: 'latest'
  });
  return events.length;
};

const EthNodeStatus = ({ chainType, chainNodes }) => {
  const [nodeStatus, setNodeStatus] = useState([]);

  useEffect(() => {
    const fetchNodeStatus = async () => {
      const nodes = chainNodes[chainType]?.nodeUrlArray || [];
      const contractAddress = chainNodes[chainType]?.contractAddress || '';

      const statusPromises = nodes.map(async (node, index) => {
        try {
          const web3 = new Web3(new Web3.providers.HttpProvider(node));
          const blockStartTime = new Date().getTime();
          const blockNumber = (await web3.eth.getBlockNumber()).toString();
          const blockEndTime = new Date().getTime();
          const blockTimeTaken = blockEndTime - blockStartTime;

          const eventStartTime = new Date().getTime();
          const length = await queryContractEvents(web3, blockNumber, contractAddress);
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

    // Refresh data every 10 seconds
    const interval = setInterval(fetchNodeStatus, 1000);

    // Cleanup the interval on component unmount
    return () => {
      clearInterval(interval);
    };
  }, [chainType, chainNodes]);

  return (
    <div className="node-div">
      <h2>Chain Type: {chainType}</h2>
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


const FileInput = ({ onFileSelected }) => {
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      onFileSelected(file);
    }
  };

  return (
    <div>
      <input type="file" accept=".json" onChange={handleFileChange} />
    </div>
  );
};

const App = () => {
  const [chainNodes, setChainNodes] = useState(null);

  const handleFileSelected = async (file) => {
    try {
      const json = await readLocalJsonFile(file);
      setChainNodes(json);
    } catch (error) {
      console.error('Error reading JSON file:', error);
    }
  };

  return (
    <div>
      <FileInput onFileSelected={handleFileSelected} />
      {chainNodes ? (
        <div>
          {Object.entries(chainNodes).map(([chainType, config]) => (
            <EthNodeStatus key={chainType} chainType={chainType} chainNodes={chainNodes} />
          ))}
        </div>
      ) : (
        <div>No chain nodes data loaded.</div>
      )}
    </div>
  );
};

export default App;