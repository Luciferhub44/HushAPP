import { Box, H2, Text, Table, TableRow, TableCell, TableHead } from '@admin-bro/design-system';

const Dashboard = () => {
  return (
    <Box>
      <H2>Welcome to Hush Admin Dashboard</H2>
      <Text>Quick Statistics</Text>
      
      <Box variant="white" mt="xl">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Metric</TableCell>
              <TableCell>Value</TableCell>
            </TableRow>
          </TableHead>
          <TableRow>
            <TableCell>Total Users</TableCell>
            <TableCell>{stats.users}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Total Orders</TableCell>
            <TableCell>{stats.orders}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Revenue</TableCell>
            <TableCell>${stats.revenue}</TableCell>
          </TableRow>
        </Table>
      </Box>
    </Box>
  );
};

export default Dashboard; 