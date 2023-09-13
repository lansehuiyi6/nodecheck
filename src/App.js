import React, { useState, useEffect } from 'react';
import Web3 from 'web3';

import './App.css';

import ReactModal from 'react-modal';
import { useRef } from 'react';

ReactModal.setAppElement('#root'); 

const contractAbi = require('./abi/abi.CrossDelegate.json');

global.testnet = false;

global.isExpanded = true;

const defaultConfig = global.testnet ? require('./chainConfig-testnet.json') : require('./chainConfig-mainnet-set.json');

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
const queryContractEvents = async (web3, blockNumber, contractAddress, range) => {
  const contract = new web3.eth.Contract(contractAbi, contractAddress);
  const events = await contract.getPastEvents('allEvents', {
    fromBlock: (parseInt(blockNumber) - range).toString(),
    toBlock: 'latest'
  });
  return events.length;
};

const EthNodeStatus = ({ chainType, chainNodes, isAllExpanded }) => {
  const [nodeStatus, setNodeStatus] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false || isAllExpanded);

  useEffect(() => {
    const intervalTime = chainNodes[chainType]?.intervalTime || 5000;
    const fetchNodeStatus = async () => {
      if (!(isExpanded || isAllExpanded)) {
        return {};
      }
      const nodes = chainNodes[chainType]?.nodeUrlArray || [];
      const contractAddress = chainNodes[chainType]?.contractAddress || '';
      const range = chainNodes[chainType]?.range || 2000;

      const statusPromises = nodes.map(async (node, index) => {
        try {
          const web3 = new Web3(new Web3.providers.HttpProvider(node));
          const blockStartTime = new Date().getTime();
          const blockNumber = (await web3.eth.getBlockNumber()).toString();
          const blockEndTime = new Date().getTime();
          const blockTimeTaken = blockEndTime - blockStartTime;

          let length, eventTimeTaken;
          try {
            const eventStartTime = new Date().getTime();
            length = await queryContractEvents(web3, blockNumber, contractAddress, range);
            const eventEndTime = new Date().getTime();
            eventTimeTaken = eventEndTime - eventStartTime;
          } catch (err) {
            return {
              nodeIndex: index + 1,
              rpcServerAddress: node,
              error: err.message ? "blockNumber " +  blockNumber + " " + err.message : "blockNumber " +  blockNumber + " " + err
            };
          }

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
    const interval = setInterval(fetchNodeStatus, intervalTime);

    // Cleanup the interval on component unmount
    return () => {
      clearInterval(interval);
    };
  }, [chainType, chainNodes, isAllExpanded, isExpanded]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`node-div ${(isExpanded || isAllExpanded) ? 'expanded' : 'collapsed'}`}>
      <div className="header">
        <h2>
          Chain Type: {chainType}
          <button className="expand-button" onClick={toggleExpand}>
          <span className="arrow-icon">{(isExpanded || isAllExpanded) ? '▲' : '▼'}</span>
          </button>
        </h2>
      </div>

      {(isExpanded || isAllExpanded) && (
        <div className="table-container">
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
                      <td colSpan="4" className="error-cell">Error: {status.error}</td>
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
      )}
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
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formattedJson, setFormattedJson] = useState('');
  const [isAllExpanded, setIsExpanded] = useState(false);
  const [isTestnet, setIsTestnet] = useState(global.testnet);

  const handleFileSelected = async (file) => {
    try {
      const json = await readLocalJsonFile(file);
      setChainNodes(json);
      setLoading(false);
    } catch (error) {
      console.error('Error reading JSON file:', error);
      setLoading(false);
    }
  };

  const toggleNetwork = () => {
    setIsTestnet(!isTestnet);
    const config = isTestnet ? require('./chainConfig.json') : require('./chainConfig-testnet.json');
    setChainNodes(config);
  };

  useEffect(() => {
    const fetchDefaultFile = async () => {
      try {
        setChainNodes(defaultConfig);
      } catch (error) {
        console.error('Error fetching default file:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDefaultFile();
  }, []);

  const openModal = () => {
    setShowModal(true);
    setFormattedJson(JSON.stringify(chainNodes, null, 2)); // 格式化 JSON 字符串
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const expandAll = () => {
    setIsExpanded(true);
  };

  const collapseAll = () => {
    setIsExpanded(false);
  };

  const textareaRef = useRef(null);

  const copyToClipboard = () => {
    const textToCopy = textareaRef.current.innerText;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        console.log('Text copied to clipboard');
      })
      .catch((error) => {
        console.error('Failed to copy text to clipboard:', error);
      });
  };

  return (
    <div>
      <h1 className="page-title">Cross Chain Node Status</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="button-container">
            <FileInput onFileSelected={handleFileSelected} />
            <button onClick={openModal}>显示chainConfig</button>
            <button onClick={toggleNetwork}>
              {isTestnet ? '切换为主网' : '切换为测试网'}
            </button>
            <button onClick={expandAll}>全部展开</button>
            <button onClick={collapseAll}>全部关闭</button>
          </div>
          {chainNodes ? (
            <div>
              {Object.entries(chainNodes).map(([chainType, config]) => (
                <EthNodeStatus key={chainType} chainType={chainType} chainNodes={chainNodes} isAllExpanded={isAllExpanded} />
              ))}
            </div>
          ) : (
            <div>No chain nodes data loaded.</div>
          )}
          <ReactModal
            isOpen={showModal}
            onRequestClose={closeModal}
            contentLabel="JSON Modal"
            className="modal-content"
            overlayClassName="modal-overlay"
          >
            <pre className="modal-text" ref={textareaRef}>{formattedJson}</pre>
            <button onClick={copyToClipboard}>复制</button>
            <button onClick={closeModal}>关闭</button>
          </ReactModal>

        </>
      )}
    </div>

  );
};

export default App;